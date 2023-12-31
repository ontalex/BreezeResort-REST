import db from "../db.js";
import { invalid, notFound } from "../errors/errors.js";
import { validation } from "../errors/validations.js";

class Hotels {
    addRoom(req, res) {
        let { name, number } = req.body;

        // Проверка на наличие плей в запросе
        if (!validation(req.body, ["name", "number"], { "message": "The given data was invalid.", "errors": {} }, (data) => res.status(403).json(data))) {
            return null;
        }

        // Формируем данные для запроса
        let sqlQuery = "INSERT INTO hotels (name, number) VALUES (?, ?);";
        let fieldQuery = [name, number];
        let funQuery = (errDB, resDB) => {

            console.log("\n\n>> RES DB", resDB, "<<<<");
            console.log("\n\n>> ERR DB", errDB, "<<<<");

            if (errDB && errDB.errno == 1062) {
                res.status(403).json(invalid(["duplicate"], ["Hotel already registered"]));
                return null;
            } else if (errDB) {
                res.status(403).json(notFound);
                return null;

            }

            res.status(201).json({
                data: {
                    id: resDB.insertId,
                    name: name,
                    number: number
                }
            });

        }

        db.query(sqlQuery, fieldQuery, funQuery);
    }

    getAllRooms(req, res) {
        let sqlQuery = "SELECT name, number FROM hotels;";
        let funQuery = (errDB, resDB) => {

            // Проверяем на пустой набор данных с БД
            if (resDB.length == 0) {
                res.status(403).json(notFound);
                return null;
            };

            res.status(200).json({
                list: resDB
            });
        }

        db.query(sqlQuery, funQuery);
    }

    deleteHotel(req, res) {
        let { id } = req.params;

        // Проверка на наличие полей в запрсое
        if (!validation(req.params, ["id"], { "message": "Invalid", "errors": {} }, (data) => res.status(403).json(data))) {
            return null;
        }

        let sqlQuery = "DELETE FROM hotels WHERE id = ?;";
        let fieldQuery = [id];
        let funQuery = (errDB, resDB) => {

            console.log("\n\n>> RES DB", resDB, "<<<<");
            console.log("\n\n>> ERR DB", errDB, "<<<<");

            if(resDB.affectedRows == 0) {
                res.status(403).json(notFound);
                return null;
            }

            res.status(200).json({
                data: {
                    message: "Deleted"
                }
            })


        }

        db.query(sqlQuery, fieldQuery, funQuery);

    }

    mergeRoomInHotel(req, res) {
        let { id, idroom } = req.params;

        // Проверка на наличие полей в запросе
        if (!validation(req.params, ["id", "idroom"], { "message": "The given data was invalid.", "errors": {} }, (data) => res.status(401).json(data))) {
            return null;
        }
        
        // формируем данные для запроса
        let fieldQuery = [id, idroom];
        let sqlQuery = "UPDATE rooms SET idhotel = ? WHERE id = ?;";
        let funQuery = (errDB, resDB) => {

            console.log(">>> ERROR DB", errDB);
            console.log(">>> RES DB", resDB);

            // Обрабатываем другие ошибки
            if (errDB) {
                res.status(403).json(notFound);
                return null;
            }

            // Проверяем на пустой набор данных с БД
            if (resDB.affectedRows == 1) {

                db.query(
                    "SELECT rooms.name, hotels.name as title FROM rooms JOIN hotels ON rooms.idhotel = hotels.id WHERE rooms.id = ?;",
                    [idroom],
                    (errDBNext, resDBNext) => {

                        console.log(">> Res >> ", resDBNext);

                        res.status(201).json({
                            data: {
                                name: resDBNext[0].name,
                                title: resDBNext[0].title
                            }
                        });
                        return null;

                    }
                );
                return null;
            } else {
                
                res.status(403).json(notFound);
                return null;
            }

        }

        db.query(sqlQuery, fieldQuery, funQuery);
    }

    getRoomsInHotels(req, res) {
        // формируем данные для запроса
        let sqlQuery = 'SELECT  hotels.name as title, hotels.number, rooms.name, clients.fio, clients.phone as phonenumber  FROM hotels  LEFT JOIN rooms ON hotels.id = rooms.idhotel  LEFT JOIN clients ON rooms.id = clients.id_childata;';
        let funQuery = (errDB, resDB) => {

            if (errDB) {
                console.log(">>> ERROR DB", errDB);
                res.status(403).json(notFound);
                return null;
            }

            if (resDB.length == 0) {
                res.status(403).json(notFound);
                return null;
            } else {

                // Проходимся по матрице для формирования первого уровня отчёта
                const output = Object.entries(resDB.reduce((acc, item) => {
                    const { title, number, ...rest } = item;

                    acc[title] = acc[title] || { title: title, number: number, data_children: [] };
                    acc[title].data_children.push(rest);

                    return acc;
                }, {})).map(([title, data_children]) => {

                    // Проходим по второму уровню 
                    let outputNext = Object.entries(data_children["data_children"].reduce((accNext, itemNext) => {
                        const { name, ...restNext } = itemNext;

                        if (name == null) return accNext;

                        accNext[name] = accNext[name] || { name: name, userdata: [] };

                        if(restNext.fio == null) return accNext;
                        
                        accNext[name].userdata.push(restNext);

                        return accNext;
                    }, {})).map(([name, userdata]) => (userdata));

                    // Возврат весь объект данных
                    return { title: data_children.title, number: data_children.number, data_children: outputNext };

                }, []);

                res.status(200).json({data: output});
            }

        };

        db.query(sqlQuery, funQuery);
    }

}

export default new Hotels();
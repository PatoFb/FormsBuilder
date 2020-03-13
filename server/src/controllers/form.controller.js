const jwt = require('jsonwebtoken');
const sql = require('mssql');
const express = require('express');
const db = require('../database/database');
const Cuestionario = require('../models/Cuestionario');
const CuestionarioPreguntaMult = require('../models/CuestionarioPreguntasMult');
const LlenadoPreguntaAbierta = require('../models/LlenadoPreguntaAbierta');
const LlenadoCuestionario = require('../models/LlenadoCuestionario');
const bycrypt = require('bcryptjs');

module.exports.getFormByUserId = (req, res) => {

    Cuestionario.findAll({
        where: {
            fk_idUsuarioCreador: req.body.idCreador
        }
    }).then(cuestionario => {

        if (!cuestionario)
            console.log("No hay ningun cuestionario creado por el idCreador ".concat(idCreador));

        res.json(cuestionario);
    })
}

function CreateOpenQuestion(idCuestionario, params) {

    let pregunta = params.texto;

    //Crear el request
    let request = new sql.Request();

    //Declarar parametros de entrada y salida
    request.input('p_idCuestionario', sql.Int, idCuestionario);
    request.input('p_textoPregunta', sql.VarChar(500), pregunta);

    //Ejecutar el request
    request.execute('preguntaAbierta_C', (err, result) => {
        return result; //res.json(result.recordset);
    });
}

function CreateMultipleQuestion(idCuestionario, params) {

    let pregunta = params.texto;
    let opciones = ["", "", "", "", ""];

    for (let i = 0; i < params.opciones.length; i++) {
        opciones[i] = params.opciones[i].opcion;
    }

    //Crear el request
    let request = new sql.Request();

    //Declarar parametros de entrada y salida
    request.input('p_idCuestionario', sql.Int, idCuestionario);
    request.input('p_textoPregunta', sql.VarChar(500), pregunta);
    request.input('p_opcion1_texto', sql.VarChar(100), opciones[0]);
    request.input('p_opcion2_texto', sql.VarChar(100), opciones[1]);
    request.input('p_opcion3_texto', sql.VarChar(100), opciones[2]);
    request.input('p_opcion4_texto', sql.VarChar(100), opciones[3]);
    request.input('p_opcion5_texto', sql.VarChar(100), opciones[4]);

    //Ejecutar el request
    request.execute('preguntaMultiple_C', (err, result) => {
        return result;
    });
}

function Create(idCreador, params) {
    //Datos a insertar
    const cuestionarioData = {
        Nombre: params.Nombre,
        fk_idUsuarioCreador: idCreador,
        Descripcion: params.Descripcion,
    }

    return new Promise((resolve, reject) => {
        //Crear el cuestionario
        Cuestionario.create(cuestionarioData)
            .then(cuestionario => {
                resolve(cuestionario.dataValues);
            }).catch(error => { reject('error') });
    });
}

function CreateFill(idCreador, idCuestionario) {
    let currentDate = new Date();

    //Datos a insertar
    const fillData = {
        fk_idUsuario: idCreador,
        fk_idCuestionario: idCuestionario,
        Fecha: currentDate
    }

    return new Promise((resolve, reject) => {
        //Create el filler
        LlenadoCuestionario.create(fillData)
            .then(llenado => {
                resolve(llenado.dataValues);
            });
    });
}

function GetOpenQuestions(idCuestionario) {
    //Crear el request
    let request = new sql.Request();

    //Declarar parametros de entrada y salida
    request.input('p_idCuestionario', sql.Int, idCuestionario);

    //Ejecutar el request
    return new Promise((resolve, reject) => {
        request.execute('preguntaAbierta_R', (err, result) => {
            resolve(result.recordset);
        });
    });
}

function GetMultipleQuestions(idCuestionario) {

    let request = new sql.Request();
    let preguntasMultiplesObj = [];

    return new Promise((resolve, reject) => {

        setTimeout(() => resolve(preguntasMultiplesObj), 1000);

        //Buscar todas las preguntas del cuestionario
        CuestionarioPreguntaMult.findAll({
            where: {
                fk_idCuestionario: idCuestionario
            }
        }).then(CuestionarioPreguntaMult => {

            for (index in CuestionarioPreguntaMult) {

                let pregMult = {};
                let element = CuestionarioPreguntaMult[index];

                //Conseguir el texto de la pregunta
                request = new sql.Request();
                request.input('p_idCuestionarioPreguntaMult', sql.Int, element.idCuestionarioPreguntasMult);
                request.execute('textoPreguntaMult_R', (err, result) => {
                    pregMult["texto"] = result.recordset[0].Pregunta;
                });

                //Conseguir las opciones
                request2 = new sql.Request();
                request2.input('p_idCuestionarioPreguntaMult', sql.Int, element.idCuestionarioPreguntasMult);
                request2.execute('OpcionesPreguntaMult_R', (err, result2) => {
                    pregMult["opciones"] = result2.recordset;
                });

                //Agregar el registro al arreglo
                preguntasMultiplesObj.push(pregMult);
            }
        })
    });
}

function GetFormOpenQuestion(idCuestionario, pregunta) {
    //Crear el request
    let request = new sql.Request();

    //Declarar parametros de entrada y salida
    request.input('p_idCuestionario', sql.Int, idCuestionario);
    request.input('p_pregunta', sql.VarChar, pregunta);

    //Ejecutar el request
    return new Promise((resolve, reject) => {
        request.execute('getCuestionarioPregunta', (err, result) => {
            resolve(result.recordset[0]);
        });
    });
}

module.exports.CreateUpdateForm = (req, res) => {
    //Checar si el formulario ya existe
    Cuestionario.findOne({
        where: {
            Nombre: req.body.Nombre
        }
    }).then(cuestionario => {

        //Si se va a actualizar el cuestionario
        if (cuestionario) {
            //TODO: Actualizar cuestionario
        }

        //Si se va a crear el cuestionario
        else {
            //Creación del cuestionario
            Create(req.body.idUsuarioCreador, req.body).then((newCuestionario) => {

                //Crear las preguntas abiertas
                req.body.preguntasAbiertas.forEach(element => {
                    if (CreateOpenQuestion(newCuestionario.idCuestionario, element) == -1)
                        console.log("Error al crear pregunta abierta");
                });

                //Crear las preguntas múltiples
                req.body.preguntasMultiples.forEach(element => {
                    if (CreateMultipleQuestion(newCuestionario.idCuestionario, element) == -1)
                        console.log("Error al crear pregunta múltiple");
                });
            });
        }
    }).then(() => {
        //Mandar un response de que ya terminó el proceso
        res.json("Done");
    });
}

module.exports.GetFormQuestions = (req, res) => {

    cuestionarioJson = {};

    //Checar si el formulario ya existe
    Cuestionario.findOne({
        where: {
            idCuestionario: req.params.idForm
        }
    }).then(cuestionario => {
        //Checar si el cuestionario existe
        if (cuestionario) {

            cuestionarioJson["Nombre"] = cuestionario.Nombre;
            cuestionarioJson["Descripcion"] = cuestionario.Descripcion;

            GetMultipleQuestions(cuestionario.idCuestionario).then((preguntasMultiples) => {
                cuestionarioJson["preguntasMultiples"] = preguntasMultiples;
            }).then(() => {
                GetOpenQuestions(cuestionario.idCuestionario).then((preguntasAbiertas) => {
                    cuestionarioJson["preguntasAbiertas"] = preguntasAbiertas;
                    res.json(cuestionarioJson);
                });
            });
        }
        else {
            console.log("No existe el cuestionario");
            return;
        }
    });
}

module.exports.FillForm = (req, res) => {

    /*//Checar si el formulario ya existe
    Cuestionario.findOne({
        where: {
            idCuestionario: req.params.idForm
        }
    }).then(cuestionario => {*/


    /*let idCuestionario = req.body.idCuestionario;        
    let idUsuario = req.body.idUsuarioLlenador;*/

    let idUsuario = 14;
    let idCuestionario = 29;
    let pregunta = "gatos o perros?";

    let currentDate = new Date();

    //Datos a insertar en tabla LlenadoCuestionario
    const fillData = {
        fk_idUsuario: idUsuario,
        fk_idCuestionario: idCuestionario,
        Fecha: currentDate
    }

    //Crear llenado
    LlenadoCuestionario.create(fillData)
        .then(llenado => {

            //Guardar preguntas múltiples


            //Guardar preguntas abiertas


            //Obtener la pregunta por medio de un procedimiento (dado un cuestionario y el texto de una pregunta)
            GetFormOpenQuestion(idCuestionario, pregunta).then((formOpenQuestion) => {

                const llenadoData = {
                    fk_idLlenado: llenado.dataValues.idLlenado,
                    fk_idCuestionarioPreguntaAbierta: formOpenQuestion.idCuestionarioPreguntaAbierta,
                    Respuesta: "AMBOS"
                }

                LlenadoPreguntaAbierta.create(llenadoData)
                    .then(llenadoPreguntaAbierta => {
                        res.json(llenadoPreguntaAbierta.dataValues);
                    }).catch(error => { res.json(error) });
                
            });
        });
}
const express = require('express');
const { User } = require('../models/user.js');
var router = express.Router();
var ObjectId = require('mongoose').Types.ObjectId;
const auth = require('./auth.controller.js');

router.get('/', (req, res) => {
    User.find((err, docs) => {
        if(!err) {res.send(docs);}
        else {console.log('Error in retriving Employees : ' + JSON.stringify(err, undefined, 2)); }
    });
});

router.put('/:id', (req, res) => {
    if(!ObjectId.isValid(req.params.id)) {
        return res.status(400).send('No record with given id.')
    }

    var emp = {
        name: req.body.name,
        position: req.body.position,
        office: req.body.office,
        salary: req.body.salary,
    }
    User.findByIdAndUpdate(req.params.id, { $set: emp }, { new: true }, (err, doc) => {
        if(!err) { res.send(doc); }
        else { console.log('Error in employee Update: ' + JSON.stringify(err, undefined, 2)); }
    })
});

router.delete('/:id', (req, res) => {
    if(!ObjectId.isValid(req.params.id)) {
        return res.status(400).send('No record with given id.')
    }

    User.findByIdAndDelete(req.params.id, (err, doc) => {
        if(!err) { res.send(doc); }
        else { console.log('Error in employee Delete: ' + JSON.stringify(err, undefined, 2)); }
    })
});

module.exports = router;

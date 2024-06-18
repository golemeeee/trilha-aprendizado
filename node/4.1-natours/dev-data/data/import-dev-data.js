const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Tour = require('./../../models/tourModel');
dotenv.config({path: './config.env'});

const DB = process.env.DATABASE_LOCAL;

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false
    })
    .then(() => console.log('DB connection sucessful!'));

// READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`/tours-simple.json`, 'utf-8'));

//IMPORT DATA INTO DB
const importData = async () =>{
    try {
      await Tour.create(tours);
      console.log('Data sucessfully loaded!');
    } catch (err) {
      console.log(err);
    }
    process.exit()
}

//DELETE ALL DATA
const deleteData = async () =>{
    try {
      await Tour.deleteMany();
      console.log('Data sucessfully deleted!');
    } catch (err) {
      console.log(err);
    }
    process.exit()
}

if (process.argv[2] === '--import'){
    importData();
} else if (process.argv[2] === '--delete'){
    deleteData();
}


console.log(process.argv);
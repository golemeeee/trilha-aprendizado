const dotenv = require('dotenv');
const mongoose = require('mongoose');

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION!');
    console.log(err.name, err.message);
    process.exit(1);
    
});

dotenv.config({path: './config.env'});
const app = require('./app');


const DB = process.env.DATABASE_LOCAL;

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false
    })
    .then(() => console.log('DB connection sucessful!'));

const port = process.env.PORT || 3001;
app.listen(port, () =>{
    console.log(`App running on port ${port}...`)
});

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION!');
    console.log(err.name, err.message);
    server.close( () => {
        process.exit(1);
    });
    
});


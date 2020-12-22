var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

async function getposts(){
    MongoClient.connect(url, function(err, db){
        if(err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("posts").find({}).toArray(function(err, result){
            if (err) throw err;
            db.close();
            return result;
        });
    });
}


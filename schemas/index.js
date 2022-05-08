const mongoose = require("mongoose");

const connect = () => {
  if (process.env.NODE_ENV !== "production") {
    mongoose.set("debug", true);
  }

  
  let URL = `mongodb://${ process.env.MONGO_USER }:${ process.env.MONGO_USER_PWD }@127.0.0.1:27017/${ process.env.MONGO_DB}?authSource=admin&authMechanism=SCRAM-SHA-1`
  // let URL = `mongodb://${ process.env.MONGO_USER }:${ process.env.MONGO_USER_PWD }@mongo:27017/${ process.env.MONGO_DB}?authSource=admin&authMechanism=SCRAM-SHA-1`;
  // let URL = `mongodb://${ process.env.MONGO_USER }:${ process.env.MONGO_USER_PWD }@mongo:27017/gps`;
  // console.log(URL); 

  if(process.env.NODE_ENV === 'production') {
    URL = process.env.MONGO_URL;
  } 

  mongoose.connect(
    URL,
    {
      dbName: "gps",
      useNewUrlParser: true,
    },
    (error) => {
      if (error) {
        console.log("몽고디비 연결 에러", error);
      } else {
        console.log("몽고디비 연결 성공");
      }
    }
  );
};
mongoose.connection.on("error", (error) => {
  console.error("몽고디비 연결 에러", error);
});
mongoose.connection.on("disconnected", () => {
  console.error("몽고디비 연결이 끊겼습니다. 연결을 재시도합니다.");
  connect();
});

module.exports = connect;

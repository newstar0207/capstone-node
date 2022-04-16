const mongoose = require("mongoose");

const connect = () => {
  if (process.env.NODE_ENV !== "production") {
    mongoose.set("debug", true);
  }

  // console.log(process.env.MONGO_CONFIG, "@@@@@@@@@@@@@@@@@@@@@@@2222");
  mongoose.connect(
    // process.env.MONGO_URL,
    process.env.MONGO_CONFIG,
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

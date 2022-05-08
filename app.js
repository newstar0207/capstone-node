const express = require("express");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
const dotenv = require("dotenv");
const { swaggerUi, specs } = require("./swagger/Swagger");
// const { scheduleJob } = require("./schedule"); // schedule (트랙 사용자 없으면 삭제하기 위함)

dotenv.config();

const connect = require("./schemas");
const trackRouter = require("./routes/tracks");
const gpsRouter = require("./routes/gpsDatas");
const userRouter = require("./routes/users");

const app = express();

app.use(cors());

app.set("port", process.env.PORT || 3000);

connect();

app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));
// body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser(process.env.COOKIE_SECRET));

if (process.env.NODE_ENV !== 'production') {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));
}

app.use("/api/tracks", trackRouter);
app.use("/api/gpsdata", gpsRouter);
app.use("/api/users", userRouter);
// scheduleJob();

app.get("/", function (req, res) {
  console.log(req);
  res.send("hello world");
});

app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  res.status(404).json({ message: error });
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(503).json({ message: "mongodb error" });
});

app.listen(app.get("port"), () => {
  console.log(app.get("port"), "번 포트에서 대기 중");
});

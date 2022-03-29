const express = require("express");
const { body, validationResult, param } = require("express-validator");
const ActivityRecord = require("../models/ActivityRecord");
const ObjectId = require("mongoose").Types.ObjectId;
const GPSdata = require("../schemas/gpsData");
const EventType = require("../types/EventType");
const { checkToken } = require("./middlewares");

/**
 * @swagger
 * tags:
 *   name: GPSdatas
 *   description: GPSdata 관리에 관한 API
 */

const router = express.Router();

/**
 * @swagger
 * /api/gpsdata:
 *  get:
 *    summary: Return 모든 gpsdata ID를 리턴함.
 *    tags: [GPSdatas]
 *    responses:
 *      '200':
 *        description: array 안 object 입니다.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/getGpsData200'
 *      '404':
 *        description: GPSdata가 없을 경우
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/getGpsData404'
 */

router.get("/", async (req, res, next) => {
  try {
    const gpsDataId = await GPSdata.find({}).select("id").exec();
    if (!gpsDataId.length) {
      return res.status(404).json({ message: "저장된 GPSdata가 없습니다." });
    }

    return res.status(200).json(gpsDataId);
  } catch (err) {
    // database error
    console.log(err);
    next(err);
  }
});

/**
 *  @swagger
 *  /api/gpsdata:
 *    post:
 *      summary: Add GPSdata를 저장하고 ID 를 리턴함.
 *      tags: [GPSdatas]
 *      requestBody:
 *        required: true
 *        description: "자전거: B, 달리기: R"
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/GPSdata'
 *      responses:
 *        '201':
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/postGpsData201'
 *        '400':
 *          description: request body failed
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/postGpsData400'
 */

router.post(
  "/",
  body("event")
    .exists()
    .isIn([EventType.RIDING, EventType.BIKE])
    .withMessage({ message: "event 입력 형식이 잘못되었습니다." }),
  body("speed").exists(),
  body("distance").custom((value) => {
    // 총 거리를 이용해 validation
    if (value[value.length - 1] < 0.1) {
      return Promise.reject("최단거리 100m(0.1) 입니다.");
    }
    return true;
  }),
  async (req, res, next) => {
    // body validator error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const storeActivityRecord = new ActivityRecord(req.body);

    const checkSpeedResult =
      storeActivityRecord.event === EventType.RIDING
        ? checkSpeedRun(storeActivityRecord.speed)
        : checkSpeedBike(storeActivityRecord.speed);

    // speed error
    if (!checkSpeedResult) {
      return res.status(400).json({ message: "잘못된 속도 데이터 입니다." });
    }

    try {
      const gpsData = await GPSdata.create(storeActivityRecord);
      // created
      return res.status(201).json({ gpsDataId: gpsData.id });
    } catch (err) {
      // database error
      console.log(err);
      next(err);
    }
  }
);

const checkSpeedRun = (speeds) => {
  for (let speed of speeds) {
    if (speed >= 44) {
      console.log(speed);
      return false;
    }
  }
  return true;
};

const checkSpeedBike = (speeds) => {
  for (let speed of speeds) {
    if (speed >= 144) {
      console.log(speed);
      return false;
    }
  }
  return true;
};

/**
 *  @swagger
 *  /api/gpsdata/{gpsdataId}:
 *    get:
 *      summary: Return 특정한 GPSdata를 리턴
 *      tags:
 *        - GPSdatas
 *      parameters:
 *        - in: path
 *          name: gpsdataId
 *          required: true
 *          example: 62256147dc2958292cb17110
 *      responses:
 *        '200':
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/GPSdata'
 *        '400':
 *          description: parameter error
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getGpsData400'
 *        '404':
 *          description: GPSdata 존재하지 않음
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getGpsData404'
 *
 */

router.get(
  "/:gpsdataId",
  param("gpsdataId").custom((value) => {
    if (!ObjectId.isValid(value)) {
      return Promise.reject("잘못된 mongodb ID 입니다.");
    }
    return true;
  }),
  async (req, res, next) => {
    // parameter validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const gpsData = GPSdata.findById(req.params.gpsdataId);
      gpsData.exec((err, result) => {
        if (err) {
          console.error(err);
          next(err);
        }
        if (!result) {
          return res
            .status(404)
            .json({ message: "gpsData가 존재하지 않습니다." });
        }
        return res.status(200).json(result);
      });
    } catch (err) {
      // database error
      console.error(err);
      next(err);
    }
  }
);

/**
 *  @swagger
 *  /api/gpsdata/{gpsdataId}:
 *    delete:
 *      summary: Delete 특정한 GPSdata를 삭제함
 *      tags:
 *        - GPSdatas
 *      parameters:
 *        - in: path
 *          name: gpsdataId
 *          required: true
 *          example: 62256147dc2958292cb17110
 *      responses:
 *        '200':
 *          description: OK
 *        '400':
 *          description: parameter validation
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getGpsData400'
 */

router.delete(
  "/:gpsdataId",
  param("gpsdataId").custom((value) => {
    if (!ObjectId.isValid(value)) {
      return Promise.reject("잘못된 mongodb ID 입니다.");
    }
    return true;
  }),
  async (req, res, next) => {
    // parameter validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      await GPSdata.deleteOne({ id: req.params.gpsdataId });
      res.status(200).json({ message: "gpsData를 삭제하였습니다" });
    } catch (err) {
      // database error
      console.error(err);
      next(err);
    }
  }
);

module.exports = router;

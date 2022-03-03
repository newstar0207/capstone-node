const express = require("express");
const GPSdata = require("../schemas/gpsData");
const { checkToken } = require("./middlewares");
/**
 * @swagger
 * tags:
 *   name: GPSdatas
 *   description: GPSdata 관리에 관한 API
 */

const router = express.Router();

/**
 *  @swagger
 *  /api/gpsdata:
 *    post:
 *      summary: Add 새로운 GPSdata 저장
 *      tags: [GPSdatas]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/GPSdatas'
 *      responses:
 *        '201':
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/GPSdata'
 */

router.post("/gpsdata", async (req, res, next) => {
  // TODO: 기록이 자전거나, 달리기로 나올 수 있는 기록인가?
  const checkSpeedResult = checkSpeed(JSON.parse(req.body.speed)); // 다시
  if (checkSpeedResult === false) {
    return res.json({ message: "올바르지 않은 데이터 입니다." });
  }

  try {
    const gpsData = await GPSdata.create({
      trackId: req.body.trackId,
      userId: req.body.userId,
      gps: { coordinates: JSON.parse(req.body.gps) }, // gps 좌표
      speed: JSON.parse(req.body.speed),
      time: JSON.parse(req.body.time),
      totalTime: req.body.totalTime,
      distance: JSON.parse(req.body.distance),
      event: req.body.event,
      altitude: JSON.parse(req.body.altitude),
    });
    console.log(gpsData);
    res
      .status(201)
      .json({ gpsId: gpsData.id, message: "gpsData를 저장합니다." });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

const checkSpeed = (speeds) => {
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
 *  /api/{trackId}/rank:
 *    get:
 *      summary: Return 선택한 트랙의 GPSdata를 시간순으로 정렬함
 *      parameters:
 *        - in: query
 *          name: trackId
 *          required: true
 *          example: 621390d75463764b87a94f1d
 *      tags:
 *        - GPSdatas
 *      responses:
 *        '200':
 *          description: 검색한 트랙의 결과를 가져옴
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/GPSdataRank'
 */
router.get("/:trackId/rank", async (req, res, next) => {
  // TODO: 특정한 컬럼만 리턴하기
  try {
    const GPSdatas = GPSdata.find({ trackId: req.params.trackId })
      .select("userId totalTime createdAt")
      .sort({ totalTime: "asc" });
    GPSdatas.exec((err, result) => {
      if (err) {
        console.error(err);
        next(err);
      } else {
        if (result.length == 0) {
          res.status(200).json({ message: "gpsData가 존재하지 않습니다." });
        }
        res.status(200).json(result);
      }
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

// TODO: 팔로우 한 사람만 나오는 트랙별 랭킹 (시간 순)

/**
 *  @swagger
 *  /api/{gpsdataId}/gpsdata:
 *    get:
 *      summary: Return 특정한 GPSdata를 리턴
 *      tags:
 *        - GPSdatas
 *      parameters:
 *        - in: path
 *          name: gpsdataId
 *          required: true
 *          example: 621390d75463764b87a94f1d
 *      responses:
 *        '200':
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/GPSdatas'
 */

router.get("/:gpsdataId/gpsdata", async (req, res, next) => {
  try {
    const paceMaker = GPSdata.findById(req.params.gpsdataId);
    paceMaker.exec((err, result) => {
      if (err) {
        console.error(err);
        next(err);
      } else {
        if (result.length == 0) {
          res.status(200).json({ message: "gpsData가 존재하지 않습니다." });
        }
        res.status(200).json(result);
      }
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

/**
 *  @swagger
 *  /api/{gpsdataId}/gpsdata:
 *    delete:
 *      summary: Delete 특정한 GPSdata를 삭제함
 *      tags:
 *        - GPSdatas
 *      parameters:
 *        - in: path
 *          name: gpsdataId
 *          required: true
 *          example: 621390d75463764b87a94f1d
 *      responses:
 *        '200':
 *          description: OK
 */

router.delete("/:gpsdataId/gpsdata", async (req, res, next) => {
  try {
    await GPSdata.deleteOne({ id: req.params.gpsdataId });
    res.status(200).json({ message: "gpsData를 삭제하였습니다" });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;

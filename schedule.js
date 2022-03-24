const schedule = require("node-schedule");
const GPSdata = require("./schemas/gpsData");
const Track = require("./schemas/track");

exports.scheduleJob = async () => {
  const job = schedule.scheduleJob("* * * * * *", () => {
    // second, minute, hour, day of month, month, day of week
    try {
      const gpsdatas = GPSdata.aggregate([
        {
          $match: { trackId: { $ne: null } },
        },
        {
          $group: {
            _id: "$trackId",
            count: { $count: {} },
          },
        },
        {
          $match: { count: { $lt: 11 } },
        },
      ]);
      gpsdatas.exec(async (err, result) => {
        if (err) {
          console.log(err);
        }
        if (result.length === 0) {
          return;
        }
        console.log(result, "result...");

        try {
          // TODO: 트랙을 삭제함 -> gpsData 에 연관되어있는 trackId도 null 로 바꿔야 함.
          // 꼭 해야하나? 하기도 함..
          const removeTrack = await Track.deleteMany({ _id: { $in: result } });
          console.log(removeTrack, "removeTrack...");
        } catch (err) {
          console.log(err);
        }
      });
    } catch (err) {
      console.log(err);
    }
  });
};

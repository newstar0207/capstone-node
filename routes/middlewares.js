exports.checkToken = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      res.status(419).json({ message: "토큰이 존재하지 않습니다." });
    } else {
      const tokenResult = await axios.post("http://3.35.239.14/...  ", {
        // 토큰 확인
        token: req.headers.authorization,
      });

      if (tokenResult.data.code === 401) {
        return res.json({ code: 401, message: "유효하지않은 토큰입니다." });
      } else if (tokenResult.data.code === 419) {
        return res.json({ code: 419, message: "만료된 토큰입니다." });
      }

      next();
    }
  } catch {}
};

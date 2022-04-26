FROM node:16
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
ENV HOST 0.0.0.0 
# 모든 IP를 개방
EXPOSE 3000
# 호스트 내부의 다른 컨테이너들만 접근 가능
CMD npm start



  
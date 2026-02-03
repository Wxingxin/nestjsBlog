import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const a = jwt.sign(
  {
    id: 1,
    name: "John Doe",
  },
  "secret",
  {
    expiresIn: "1h",
    algorithm: "HS256",
  },
);

console.log(a);

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNzcwMDMzMjIzLCJleHAiOjE3NzAwMzY4MjN9.irQFdC-Bi5VlSXf2546Wxu2xJwdxJvs_VI9VJ_ane1M";

const b = jwt.verify(token, "secret",{
  algorithms: ["HS256"],
});
console.log(b);

const c = jwt.decode(token, {complete: true});
console.log(c);
// const app = express();
// app.listen(3000, () => {
//   console.log('Server is running on port 3000');
// })

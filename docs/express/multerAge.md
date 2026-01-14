## client

```jsx
import React, { useMemo, useState } from "react";

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [error, setError] = useState("");

  // 本地预览 URL（选择文件后即可显示）
  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  function onFileChange(e) {
    setError("");
    setUploadedUrl("");

    const f = e.target.files?.[0];
    if (!f) return;

    // 前端做一次轻量校验（最终以服务端为准）
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) {
      setError("只允许上传 jpeg/png/webp");
      return;
    }

    // 例如限制 5MB（和后端一致）
    const maxSize = 5 * 1024 * 1024;
    if (f.size > maxSize) {
      setError("文件过大（最大 5MB）");
      return;
    }

    setFile(f);
  }

  async function upload() {
    if (!file) {
      setError("请先选择头像文件");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("avatar", file); // 字段名必须与后端 single("avatar") 一致

      const resp = await fetch("http://localhost:3000/api/avatar", {
        method: "POST",
        body: form,
        // 如果你使用 cookie session / Clerk 等，需要带上 credentials
        // credentials: "include",
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      setUploadedUrl(data.url);
      setFile(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 420,
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
      }}
    >
      <h3>上传头像</h3>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileChange}
      />

      {previewUrl && (
        <div style={{ marginTop: 12 }}>
          <div>本地预览：</div>
          <img
            src={previewUrl}
            alt="preview"
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid #ccc",
              marginTop: 8,
            }}
            onLoad={() => {
              // 释放对象 URL，避免内存泄漏（严格来说需要在 useEffect cleanup）
              URL.revokeObjectURL(previewUrl);
            }}
          />
        </div>
      )}

      <button
        onClick={upload}
        disabled={uploading || !file}
        style={{ marginTop: 12, padding: "8px 12px" }}
      >
        {uploading ? "上传中..." : "上传"}
      </button>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {uploadedUrl && (
        <div style={{ marginTop: 12 }}>
          <div>上传成功（Cloudinary URL）：</div>
          <a href={uploadedUrl} target="_blank" rel="noreferrer">
            {uploadedUrl}
          </a>

          <div style={{ marginTop: 8 }}>
            <div>线上头像预览：</div>
            <img
              src={uploadedUrl}
              alt="uploaded"
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid #ccc",
                marginTop: 8,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

## backend

```bash
server/
      lib/cloudinary.js
      middlewares/uploadAvatar.js
      routes/avatar.route.js
      .env
      .server.js
```

```js
//server.js
// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";

// import { avatarRouter } from "./src/routes/avatar.route.js";
import { avatarRouter } from "./routes/avatar.route.js";

dotenv.config();

const app = express();

// 如果前端在不同域名/端口（本地开发常见），需要 CORS
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3001"], // 按你的前端地址改
    credentials: true,
  })
);

app.use(morgan("dev"));

// 头像上传是 multipart/form-data，不走 express.json() 解析
// 但你其它 API 仍然需要 JSON：
// app.use(express.json());

app.use("/api", avatarRouter);

// 统一错误处理中间件（重要）
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // multer 的一些错误会是特定类型
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large" });
  }

  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API running at http://localhost:${port}`));
```

```js
//.env
PORT=3000

CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# 限制：头像最大 5MB
AVATAR_MAX_SIZE=5242880

```

```js
//routes/avatar.route.js
// src/routes/avatar.route.js
import { Router } from "express";
import sharp from "sharp";
import { cloudinary } from "../lib/cloudinary.js";
import { uploadAvatar } from "../middlewares/uploadAvatar.js";

export const avatarRouter = Router();

/**
 * Cloudinary 上传：用 upload_stream 支持 Buffer 直传（不落盘）
 * @param {Buffer} buffer - 图片二进制数据
 * @param {object} options - Cloudinary options
 * @returns {Promise<object>} Cloudinary upload result
 */
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * POST /api/avatar
 * form-data:
 *  - avatar: File
 *
 * 返回：
 *  { url, publicId, width, height }
 */
avatarRouter.post(
  "/avatar",
  uploadAvatar.single("avatar"),
  async (req, res, next) => {
    try {
      // 1) multer 解析后：文件在 req.file
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Missing avatar file field 'avatar'" });
      }

      // （可选）你可以从鉴权中间件里拿 userId
      // const userId = req.auth?.userId || req.user?.id;
      // 这里先用一个假 userId
      const userId = "demo_user_123";

      // 2) sharp 处理：统一成正方形、缩放、压缩
      // - fit: cover 会裁剪多余部分，保证正方形不变形
      // - position: center（尽量保留中间区域）
      const processedBuffer = await sharp(req.file.buffer)
        .rotate() // 自动根据 EXIF 旋转（手机拍照常见）
        .resize(256, 256, { fit: "cover", position: "center" })
        .webp({ quality: 80 }) // webp 更小；质量按需求调
        .toBuffer();

      // 3) 上传 Cloudinary
      // folder: 统一放在 avatars
      // public_id: 让同一用户重复上传时覆盖旧头像（可选）
      const uploadResult = await uploadToCloudinary(processedBuffer, {
        folder: "avatars",
        public_id: `user_${userId}`, // 覆盖策略：同一 userId 永远只有一个头像
        overwrite: true,
        resource_type: "image",
      });

      // uploadResult 常用字段：
      // - secure_url: https 的图片地址（推荐使用）
      // - public_id: Cloudinary 内部 id
      // - width/height/format/bytes
      const url = uploadResult.secure_url;

      // 4) 把 url 存到数据库（示意）
      // await db.user.update({ where: { id: userId }, data: { avatarUrl: url } });

      return res.json({
        url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      });
    } catch (err) {
      next(err);
    }
  }
);
```

```js
//middlewares/uploadAvatar.js
// src/middlewares/uploadAvatar.js
import multer from "multer";

const maxSize = Number(process.env.AVATAR_MAX_SIZE) || 5 * 1024 * 1024;

// 使用内存存储：req.file.buffer 直接拿到文件内容
const storage = multer.memoryStorage();

// 只允许常见图片类型（不要信任文件扩展名，只信 mime）
function fileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only jpeg/png/webp images are allowed"), false);
  }
  cb(null, true);
}

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize, // 超过会触发 LIMIT_FILE_SIZE
  },
});
```

```js
//lib/cloudinary.js
// src/lib/cloudinary.js
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

// Ensure env is loaded before Cloudinary reads process.env.
dotenv.config({ path: new URL("../.env", import.meta.url) });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
```

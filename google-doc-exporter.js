import { google } from "googleapis";
import { memoize } from "lodash-es";
import * as cheerio from "cheerio";
import { CacheWithExpiration } from "./cache.js";
import "dotenv/config.js";

const { CLIENT_EMAIL, PRIVATE_KEY } = process.env;
const CACHE_EXPIRATION_IN_SECONDS =
  parseInt(process.env.CACHE_EXPIRATION_IN_SECONDS, 10) || 1 * 60 * 60; // 1 hour

const auth = new google.auth.JWT({
  email: CLIENT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({
  version: "v3",
  auth,
});

const getGoogleDocName = (fileId) => {
  return drive.files.get({ fileId }).then((res) => {
    return res.data.name;
  });
};

const exportGoogleDoc = async (fileId) => {
  const [filename, body] = await Promise.all([
    getGoogleDocName(fileId),
    getBody(fileId),
  ]);
  return {
    title: filename.replace("ProConnect - ", ""),
    body: cleanHtmlContent(body),
  };
};

const getBody = async (fileId) => {
  console.log(`Downloading doc ${fileId}...`);
  const response = await drive.files.export(
    {
      fileId: fileId,
      mimeType: "text/html",
    },
    { responseType: "stream" },
  );

  const content = await new Promise((resolve, reject) => {
    let htmlContent = "";
    response.data
      .on("data", (data) => {
        htmlContent += data.toString();
      })
      .on("end", () => {
        console.log(`Doc ${fileId} downloaded!`);
        resolve(htmlContent);
      })
      .on("error", (err) => {
        reject(err);
      });
  });

  const regex = /@import url\(https:\/\/themes\.googleusercontent\.com[^)]*\)/;

  return content.replace(regex, "");
};

export const cleanHtmlContent = (html) => {
  const $ = cheerio.load(html);
  $("[style]").removeAttr("style");
  $("[class]").removeAttr("class");
  $("p").has("span:empty:first-child:last-child").remove();
  $("p:empty").remove();
  $("table").addClass("fr-table");
  $("table tr:first-of-type td").each(function(index, el) {
    const newCell = $(el).contents().unwrap().wrap('<th>').closest('th').attr('scope', 'col')
    $(el).replaceWith(newCell)
  })
  return $("body").html() || "";
};

export const exportMemoizedGoogleDoc = memoize(exportGoogleDoc);

exportMemoizedGoogleDoc.cache = new CacheWithExpiration(
  CACHE_EXPIRATION_IN_SECONDS * 1000,
);

import { exportMemoizedGoogleDoc } from "./google-doc-exporter.js";
import express from "express";
import morgan from "morgan";
import "dotenv/config.js";

const {
  MCP_CONVENTION_D_ADHESION_ID,
  MCP_POLITIQUE_DE_CONFIDENTIALITE_ID,
  MCP_CONDITIONS_GENERALES_D_UTILISATION_ID,
  MCP_ACCESSIBILITE_ID,
  MCP_APP_URL,
} = process.env;
const PORT = parseInt(process.env.PORT, 10) || 3000;

const app = express();

const logger = morgan("combined");
app.use(logger);
app.use(
  "/public",
  express.static("public", { maxAge: 7 * 24 * 60 * 60 * 1000 })
);
app.get("/favicon.ico", (req, res, next) =>
  res.sendFile("favicon.ico", { root: "." }),
);
app.set("view engine", "ejs");

const legalControllerFactory = (fileId) => async (req, res, next) => {
  try {
    const { title, body } = await exportMemoizedGoogleDoc(fileId);
    return res.render("index", {
      title,
      body,
      MCP_APP_URL: MCP_APP_URL.replace(/\/$/, ""),
    });
  } catch (e) {
    return next(e);
  }
};

app.get(
  "/convention-d-adhesion",
  legalControllerFactory(MCP_CONVENTION_D_ADHESION_ID),
);
app.get(
  "/politique-de-confidentialite",
  legalControllerFactory(MCP_POLITIQUE_DE_CONFIDENTIALITE_ID),
);
app.get(
  "/conditions-generales-d-utilisation",
  legalControllerFactory(MCP_CONDITIONS_GENERALES_D_UTILISATION_ID),
);
app.get(
  "/accessibilite",
  legalControllerFactory(MCP_ACCESSIBILITE_ID),
);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

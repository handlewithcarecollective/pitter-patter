import { renderRequest } from "@parcel/rsc/node";
import { ComponentType } from "react";

import {} from "@pitter-patter/collab-server";

import { getDoc } from "./database/docs.js";
import { EditorPage } from "./editor/EditorPage.js";
import { HomePage } from "./home/HomePage.js";
import { createDeployment, DemoDeployment, startServer } from "./server-base.js";

function addReact(deployment: DemoDeployment) {
  deployment.app.get("/", async (req, res) => {
    await renderRequest(req, res, <HomePage />);
  });

  deployment.app.get("/editor/:docId", async (req, res) => {
    const db = await deployment.sqliteInstance.getDb();
    const doc = await getDoc(db, req.params.docId);
    await renderRequest(req, res, <EditorPage doc={doc} />, {
      component: EditorPage as ComponentType,
    });
  });
}

const demoDeployment = createDeployment({
  sqlitePath: process.env["DATABASE_PATH"] ?? ":memory:",
});
addReact(demoDeployment);
startServer(demoDeployment, 3000).catch(console.error);

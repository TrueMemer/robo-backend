import RoboServer from "./server";

if (process.env.NODE_ENV !== "testing") {
    const server = new RoboServer();

    server.start(3000);
} else {
    // Do tests
}

import dayjs from "dayjs";

export function generateFileName(type, roomName) {

    const date = dayjs().format("YYYY-MM-DD");

    return `${type}-${roomName}-${date}.pdf`;
}
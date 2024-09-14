import { applyDecorators, Injectable, SetMetadata } from "@nestjs/common";
import { METADATA_CHANGE_STREAM_LISTENER } from "../realtime.constants";

export const ChangeStreamListener = () =>
  applyDecorators(
    SetMetadata(METADATA_CHANGE_STREAM_LISTENER, true),
    Injectable,
  );

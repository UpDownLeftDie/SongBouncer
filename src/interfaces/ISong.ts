export type ISongQueue = ISongRequest[];

export interface ISongRequest {
  requester: string;
  song: string;
}

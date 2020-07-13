export type ISongQueue = ISongRequest[];

export interface ISongRequest {
  song: string;
  requester: string;
  [key: string]: any;
}

export interface IBSSong {
  name: string;
  uploader: {
    username: string;
  };
  stats: {
    downVotes: number;
    upVotes: number;
  };
  key: string;
}

export type Entry = {
  id: string;
  username: string;
  name: string;
  reason: string;
  imageFile: string | null;
  youtubeId: string | null;
  medalEmbedUrl: string | null;
  createdAt: number;
};

export type MediaInput =
  | { kind: "image"; dataUrl: string }
  | { kind: "youtube"; url: string; id: string }
  | { kind: "medal"; url: string };

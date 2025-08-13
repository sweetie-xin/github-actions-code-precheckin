import { FileMeta } from "@/app/types/file";

export interface KBCard {
  id: number;
  title: string;
  date: string;
  creator: string;
  sources: number;
  icon: string;
  bgColor: string;
  files?: FileMeta[]; 
}
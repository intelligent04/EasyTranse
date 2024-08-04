import { ArrayMinSize, IsArray, IsString, MinLength } from 'class-validator';

export class TranslateDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  strs: string[];

  @IsString()
  @MinLength(1)
  language: string;
}

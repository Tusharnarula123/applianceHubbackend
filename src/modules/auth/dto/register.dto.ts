import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  business_name: string;

  @IsString()
  @IsNotEmpty()
  business_phone: string;

  @IsString()
  @IsNotEmpty()
  business_address: string;
}

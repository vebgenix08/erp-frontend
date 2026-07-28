import { env } from "../config/env";
import { ApiError } from "../api/api-error";

const endpoint = () => `https://cognito-idp.${env.awsRegion}.amazonaws.com/`;

async function cognitoRequest<T>(target:string,payload:Record<string,unknown>):Promise<T>{
  const response=await fetch(endpoint(),{
    method:"POST",
    headers:{"content-type":"application/x-amz-json-1.1","x-amz-target":`AWSCognitoIdentityProviderService.${target}`},
    body:JSON.stringify(payload),
  });
  const body=await response.json().catch(()=>({})) as Record<string,unknown>;
  if(!response.ok){
    const code=typeof body.__type==="string"?body.__type.split("#").pop()??"COGNITO_ERROR":"COGNITO_ERROR";
    const raw=typeof body.message==="string"?body.message:"Unable to complete password recovery";
    const message=code==="UserNotFoundException"?"If the account exists, a verification code will be sent.":code==="CodeMismatchException"?"The verification code is incorrect.":code==="ExpiredCodeException"?"The verification code has expired. Request a new code.":raw;
    throw new ApiError({code,message,retryable:false,status:response.status});
  }
  return body as T;
}

export async function requestPasswordReset(username:string){
  await cognitoRequest("ForgotPassword",{ClientId:env.cognitoClientId,Username:username.trim().toLowerCase()});
}

export async function confirmPasswordReset(input:{username:string;code:string;password:string}){
  await cognitoRequest("ConfirmForgotPassword",{
    ClientId:env.cognitoClientId,
    Username:input.username.trim().toLowerCase(),
    ConfirmationCode:input.code.trim(),
    Password:input.password,
  });
}

export function validateNewPassword(value:string):string|null{
  if(value.length<12)return "Password must contain at least 12 characters.";
  if(!/[A-Z]/.test(value))return "Add at least one uppercase letter.";
  if(!/[a-z]/.test(value))return "Add at least one lowercase letter.";
  if(!/[0-9]/.test(value))return "Add at least one number.";
  if(!/[^A-Za-z0-9]/.test(value))return "Add at least one special character.";
  return null;
}

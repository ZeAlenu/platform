import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "כניסה" };

export default function SignInPage() {
  return (
    <div className="mx-auto w-full max-w-md flex-1 ps-6 pe-6 py-16 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-serif">כניסה לחשבון</h1>
      <SignIn />
    </div>
  );
}

import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "הרשמה" };

export default function SignUpPage() {
  return (
    <div className="mx-auto w-full max-w-md flex-1 ps-6 pe-6 py-16 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-serif">פתיחת חשבון</h1>
      <SignUp />
    </div>
  );
}

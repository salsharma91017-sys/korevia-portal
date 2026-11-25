import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main>
      <div className="card">
        <h1>Sign in</h1>
        <p className="lead">KoreVia client portal for the M-Powered Pathways build: progress, test results and module acceptance.</p>
        <LoginForm />
      </div>
    </main>
  );
}

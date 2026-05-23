import AuthForm from './AuthForm';
export default function Login({ onLogin, onVerifyKeyfile, navigate }) {
  return <AuthForm mode="login" onSubmit={onLogin} onVerifyKeyfile={onVerifyKeyfile} navigate={navigate} />;
}
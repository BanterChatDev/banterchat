import AuthForm from './AuthForm';
export default function Register({ onRegister, navigate }) {
  return <AuthForm mode="register" onSubmit={onRegister} navigate={navigate} />;
}
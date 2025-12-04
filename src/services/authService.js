import { supabase } from "./supabase";
import { createOrUpdateUserProfile } from "./userService";

export const registerUser = async (name, email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  let user = data.user;
  let session = data.session;

  // Se o projeto não retornar sessão no signUp, tenta login imediato
  if (!session && email && password) {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (!loginError) {
      session = loginData.session;
      user = loginData.user;
    }
  }

  if (user) {
    try {
      await createOrUpdateUserProfile(user.id, {
        name,
        email: user.email,
        createdAt: user.created_at ? new Date(user.created_at) : new Date(),
      });
    } catch (profileError) {
      console.warn("[Auth] Falha ao criar perfil no registro:", profileError);
    }
  }

  return user;
};

export const loginUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = data.user;
  try {
    if (user?.id) {
      await createOrUpdateUserProfile(user.id, {
        name: user.user_metadata?.name || "",
        email: user.email || email,
        updatedAt: new Date(),
      });
    }
  } catch (profileError) {
    console.warn("[Auth] Falha ao atualizar/criar perfil no login:", profileError);
  }
  return data.user;
};

export const logoutUser = () => supabase.auth.signOut();

export const sendPasswordRecovery = (email) => {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_TO || undefined,
  });
};

export const verifyResetCode = async (code) => {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return data.user?.email || "";
};

export const applyPasswordReset = async (code, newPassword) => {
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) throw sessionError;
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data.user;
};

export const changePassword = async (_currentPassword, newPassword) => {
  const { data: userData, error: getError } = await supabase.auth.getUser();
  if (getError) throw getError;
  if (!userData?.user) throw new Error("Usuario nao autenticado");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

export const deleteAccount = async (currentPassword) => {
  // Reautentica com a senha informada para evitar exclusões indevidas
  const { data: userData, error: getUserError } = await supabase.auth.getUser();
  if (getUserError || !userData?.user?.email) throw getUserError || new Error("Usuário não autenticado");

  const email = userData.user.email;
  if (!currentPassword) throw new Error("Informe sua senha para excluir a conta.");

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (loginError) throw new Error(loginError.message || "Senha incorreta");

  const accessToken = loginData?.session?.access_token;
  if (!accessToken) throw new Error("Sessão não encontrada");

  const functionUrl =
    process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL ||
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-user`;

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error || "Falha ao excluir conta");
  }
};

export const updateUserAccount = async ({ name, email }) => {
  const { data: authData, error: authError } = await supabase.auth.updateUser({
    email: email || undefined,
    data: name ? { name } : undefined,
  });
  if (authError) throw authError;
  const user = authData?.user;
  if (user?.id) {
    await createOrUpdateUserProfile(user.id, {
      name: name || user.user_metadata?.name || "",
      email: email || user.email || "",
    });
  }
  return { emailPendingVerification: false };
};

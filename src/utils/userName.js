const capitalize = (value) => {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const getDisplayName = (name, email, fallback = "Linova") => {
  const cleanedName = name?.trim();
  if (cleanedName) {
    return capitalize(cleanedName.split(" ")[0]);
  }
  const localPart = email?.split("@")[0]?.replace(/[\W_]+/g, " ")?.trim();
  if (localPart) {
    return capitalize(localPart.split(" ")[0]);
  }
  return fallback;
};

export const registrationFields = [
  {
    name: "name",
    label: "Фамилия и имя*",
    placeholder: "Петров Петр",
    type: "text",
    autoComplete: "name",
    full: true,
  },
  { name: "email", label: "Почта*", placeholder: "example@domain.ru", type: "email", autoComplete: "email" },
  { name: "phone", label: "Личный телефон*", placeholder: "913 123-45-67", type: "tel", autoComplete: "tel" },
  {
    name: "company",
    label: "Компания*",
    type: "text",
    autoComplete: "organization",
  },
  {
    name: "role",
    label: "Должность*",
    type: "text",
    autoComplete: "organization-title",
  },
];
export function validateField(name, value, validity) {
  value = value.trim();
  if (!value || (name === "phone" && value === "+7")) {
    if (name === "phone") return "Укажите телефон";
    if (name === "email") return "Укажите почту";
    if (name === "name") return "Укажите фамилию и имя";
    if (name === "company") return "Укажите компанию, где работаете";
    if (name === "role") return "Укажите должность в компании";
    return "Заполните это поле";
  }
  if (name === "email" && (validity?.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))
    return "Проверьте адрес почты";
  if (name === "phone") {
    let digits = value.replace(/\D/g, "");
    if (value.startsWith("+7") || (digits.length === 11 && /^[78]/.test(digits))) digits = digits.slice(1);
    if (!/^[+\d\s().-]+$/.test(value) || digits.length !== 10)
      return "Номер телефона должен быть из 10 цифр";
    if (!/^[345689]/.test(digits))
      return "Номер телефона может начинаться на 3, 4, 5, 6, 8, 9";
  }
  return "";
}

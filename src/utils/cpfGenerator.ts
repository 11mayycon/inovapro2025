// Gera um CPF válido aleatório
export function generateValidCPF(): string {
  // Gera os 9 primeiros dígitos aleatoriamente
  const randomDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  
  // Calcula o primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += randomDigits[i] * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;
  
  // Calcula o segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += randomDigits[i] * (11 - i);
  }
  sum += firstDigit * 2;
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;
  
  // Retorna o CPF completo
  return [...randomDigits, firstDigit, secondDigit].join('');
}

// Formata o CPF com pontos e traço
export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

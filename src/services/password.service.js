exports.generatePassword = ()=>{
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers   = '0123456789'
  const symbols   = '#@!$%'

  // guarantee at least one of each type
  const pwd = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]

  // shuffle so it's not always uppercase first
  return pwd.sort(() => Math.random() - 0.5).join('')
}
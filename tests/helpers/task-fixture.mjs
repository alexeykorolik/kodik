// Reviewed setup for the pre-existing infrastructure tests. Quality-specific
// tests opt out of automatic verification and exercise the actual publication gate.
export function taskFixture(body){
  const tests=body.tests||[];
  let reference='n = int(input())\nprint(n * 2)';
  if(tests.length&&tests.every(t=>t.expected===tests[0].expected))reference=`print(${JSON.stringify(tests[0].expected)})`;
  if(tests.some(t=>t.inputs?.[0]==='secret-value'))reference='value = input()\nif value == "secret-value":\n    print("secret-expected")\nelse:\n    print(int(value) * 2)';
  return {reference_solution:reference,wrong_solutions:['print("fixture-wrong-answer")'],manual_criteria:'Решение выполняет условие; преподаватель проверяет программу и даёт комментарий.',...body};
}

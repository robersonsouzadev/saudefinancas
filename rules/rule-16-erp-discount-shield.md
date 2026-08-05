Blindagem de Desconto no ERP (Anti-Duplicidade)
MOTIVO: Impedir o erro histórico de duplicidade de descontos no Firebird. O ERP Coliseu sempre calcula o valor final do pedido somando o valor líquido dos itens. Se um desconto global for repassado no cabeçalho do pedido, o ERP subtrairá esse valor novamente, causando distorções financeiras (o infame erro do "Troco" ou abatimento duplo).

GATILHO: Ativado sempre que o agente for criar, modificar ou debugar regras de precificação, envio de payloads, middleware Node.js, ou Worker C# que interajam com as stored procedures do Firebird (`MOB_CADASTRAR_PEDIDO` e `MOB_CADASTRAR_PEDIDO_ITEM`).

RESTRICOES INEGOCIAVEIS:

-   Rateio Obrigatório nos Itens: Todo e qualquer desconto (seja ele percentual por item ou um valor global do pedido) DEVE ser rateado e aplicado diretamente no preço unitário totalístico do item (`VALOR_DESCONTO` e `VALOR_TOTAL` de `MOB_CADASTRAR_PEDIDO_ITEM`).
-   Cabeçalho Sempre Zerado: O parâmetro `VALOR_DESCONTO` da stored procedure `MOB_CADASTRAR_PEDIDO` (Cabeçalho do Pedido) DEVE SER SEMPRE `0` (zero) ou `0.0D`. Nunca repasse o `order.DiscountValue` do app para este campo.
-   Middleware Direct Sync: Se a rota de sincronização `POST /api/sync/orders` (Node.js) gravar direto no banco (Modo Direct), a variável `extraOrderDiscount` nunca deve ser enviada pro parâmetro 9 (VALOR_DESCONTO) do Header, a menos que ele mude a sintaxe. Deve sempre ir o valor `0`.

EXEMPLO ERRADO (Worker C#):

```csharp
// ERRADO - O ERP vai abater 2x!
cmd.Parameters.Add(new FbParameter("VALOR_DESCONTO", FbDbType.Double)  { Value = (double)order.DiscountValue });
```

EXEMPLO CORRETO (Worker C#):

```csharp
// CORRETO - Desconto rateado nos itens. Cabeçalho zerado.
// BLINDAGEM RULE-16: Não enviar discount global para o ERP!
cmd.Parameters.Add(new FbParameter("VALOR_DESCONTO", FbDbType.Double)  { Value = 0.0D });
```

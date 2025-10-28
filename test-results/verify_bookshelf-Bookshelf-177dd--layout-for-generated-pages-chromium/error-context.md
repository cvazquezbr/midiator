# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e6]:
    - link "LOGO" [ref=e8] [cursor=pointer]:
      - /url: /
      - heading "LOGO" [level=1] [ref=e9]
    - heading "Entrar" [level=1] [ref=e10]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - text: Endereço de E-mail
          - generic [ref=e14]: "*"
        - generic [ref=e15]:
          - textbox "Endereço de E-mail" [active] [ref=e16]
          - group:
            - generic: Endereço de E-mail *
      - generic [ref=e17]:
        - generic:
          - text: Senha
          - generic: "*"
        - generic [ref=e18]:
          - textbox "Senha" [ref=e19]
          - group:
            - generic: Senha *
      - link "Esqueceu a senha?" [ref=e21] [cursor=pointer]:
        - /url: /forgot-password
      - button "Entrar" [ref=e22] [cursor=pointer]: Entrar
      - separator [ref=e23]:
        - generic [ref=e24]: OU
      - button "Entrar com Google" [ref=e25] [cursor=pointer]: Entrar com Google
      - generic [ref=e26]:
        - link "Não tem uma conta? Cadastre-se" [ref=e27] [cursor=pointer]:
          - /url: /signup
        - link "Política de Privacidade" [ref=e28] [cursor=pointer]:
          - /url: /privacy-policy
```
# Compilação externa com EAS Build

Este projeto está preparado para gerar binários instaláveis sem o Expo Go. O perfil `internal` produz **APK** para instalação direta em Android e uma distribuição interna em iOS. O perfil `production` é destinado às lojas.

## Antes de começar

Instale o Node.js LTS e o pnpm no computador. Baixe o código do Plate Check pelo painel do projeto e, no diretório baixado, instale as dependências:

```bash
pnpm install
```

Crie ou entre em uma conta Expo e autentique o EAS CLI:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

O segundo comando vincula a cópia local do projeto à sua conta Expo e pode acrescentar o identificador do projeto no `app.config.ts`. Não exclua o arquivo `eas.json`: ele já aponta a versão compilada para o backend publicado do Plate Check.

## APK para instalar diretamente no Android

Execute o comando abaixo. Ele envia o código para a compilação remota e gera um APK assinado para instalação direta.

```bash
npx eas-cli@latest build --platform android --profile internal
```

Ao terminar, abra o link exibido no terminal ou o painel de builds da Expo, baixe o APK no celular e permita a instalação a partir da origem usada para o download. O aplicativo instalado funciona sem o Expo Go.

## IPA para iPhone

Para uma distribuição interna em iPhone, execute:

```bash
npx eas-cli@latest build --platform ios --profile internal
```

Será necessário ter uma assinatura ativa do Apple Developer Program e registrar os dispositivos que receberão a instalação. Para distribuir a um grupo maior de usuários, prefira o TestFlight.

## Versão para lojas

Quando estiver pronto para as lojas, crie os binários de produção:

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

O Android destinado à Google Play normalmente será gerado como Android App Bundle (AAB); o iOS será preparado para envio à App Store. Para esse caminho, são necessárias contas ativas na Google Play Console e no Apple Developer Program.

## Chaves e variáveis

Não há chave de API externa a fornecer para o mecanismo de conferência: o aplicativo usa o backend já publicado. A URL dele é incluída no binário pelo perfil EAS como `EXPO_PUBLIC_API_BASE_URL`.

> Não coloque senhas, tokens privados ou chaves de assinatura dentro do `eas.json`, do código-fonte ou de arquivos enviados ao repositório. Use as credenciais gerenciadas pela Expo ou variáveis seguras do EAS para qualquer segredo futuro.

## Referências

[1] [Expo — Create your first build](https://docs.expo.dev/build/setup/)

[2] [Expo — Internal distribution](https://docs.expo.dev/build/internal-distribution/)

[3] [Expo — Configure with eas.json](https://docs.expo.dev/build/eas-json/)

# AI Chat Agent - LLM Chat Application with Agent Capabilities

Rakuten AI風のモダンなUIを持つLLMチャットアプリケーションです。Azure OpenAIとGoogle Gemini APIに対応し、エージェント機能（Web検索、計算、画像分析など）を搭載しています。

![AI Chat Screenshot](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat-square&logo=tailwind-css)

## Features

### Core Features
- **Modern UI/UX** - パープル/ピンクのグラデーションを使用したモダンなデザイン
- **Streaming Response** - リアルタイムでAIの応答を表示
- **Chat History** - チャット履歴の保存・管理・削除
- **Multi-Provider Support** - Azure OpenAI / Google Gemini対応
- **Responsive Design** - PC・タブレット・スマートフォン対応
- **Dark Mode** - システム設定に応じた自動切り替え

### Agent Features (NEW!)
- **Web Search** - DuckDuckGo APIを使用したWeb検索
- **Calculator** - 数学的な計算機能
- **Current Time** - 現在日時の取得
- **Image Analysis** - マルチモーダル画像分析（Gemini/GPT-4V対応）
- **Tool Execution Display** - ツール実行状態のリアルタイム表示
- **Image Upload** - 画像をアップロードして質問

## Supported APIs

### Azure OpenAI
- エンドポイントURL
- APIキー
- デプロイメント名
- APIバージョン（2024-02-15-preview, 2024-05-01-preview, 2024-08-01-preview）
- Function Calling対応

### Google Gemini
- APIキー
- モデル選択
  - Gemini 1.5 Flash（高速）
  - Gemini 1.5 Pro（高性能）
  - Gemini 2.0 Flash（実験版）
- Function Calling対応
- マルチモーダル対応（画像分析）

## Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| 🔍 Web Search | 最新情報をWeb検索 | 「今日のニュースを検索して」 |
| 🧮 Calculator | 数学計算を実行 | 「123 × 456 を計算して」 |
| 🕐 Current Time | 現在日時を取得 | 「今何時？」 |
| 🖼️ Image Analysis | 画像を分析・説明 | 画像をアップロードして「これは何？」 |

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/seiyassm/llmapps.git
cd llmapps

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Configuration

1. サイドバー下部の「API設定」をクリック
2. 使用するAPIプロバイダーを選択
3. 必要な認証情報を入力
4. 「エージェント機能を有効化」をONにする
5. 「接続テスト」で動作確認
6. 「保存」をクリック

#### Google Gemini APIキーの取得

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. 生成されたAPIキーをコピー

#### Azure OpenAIの設定

1. [Azure Portal](https://portal.azure.com) でOpenAIリソースを作成
2. リソースからエンドポイントURLとAPIキーを取得
3. モデルをデプロイしてデプロイメント名を確認

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Date**: [date-fns](https://date-fns.org/)

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/
│   ├── ChatArea.tsx     # Main chat interface with agent support
│   ├── Sidebar.tsx      # Chat history sidebar
│   └── SettingsModal.tsx # API & Agent settings modal
├── lib/
│   ├── api.ts           # API client with function calling support
│   └── tools.ts         # Tool definitions & execution
├── store/
│   └── useStore.ts      # Zustand store with agent state
└── types/
    └── index.ts         # TypeScript types including tool types
```

## Architecture

### Agent System

```
User Input
    ↓
┌─────────────────┐
│   LLM API       │
│ (with tools)    │
└────────┬────────┘
         ↓
   Tool Calls?
    ↓      ↓
   No     Yes
    ↓      ↓
Response  Execute Tools
    ↓      ↓
         Tool Results
              ↓
         Send Back to LLM
              ↓
         Final Response
```

### Supported Function Calling

- **Azure OpenAI**: Native tool/function calling support
- **Google Gemini**: Native functionDeclarations support

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Deploy

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seiyassm/llmapps)

### Other Platforms

This is a standard Next.js application and can be deployed to any platform that supports Node.js:

- Netlify
- AWS Amplify
- Google Cloud Run
- Docker

## Roadmap

- [x] Basic Chat UI
- [x] Azure OpenAI Support
- [x] Google Gemini Support
- [x] Chat History
- [x] Agent Mode with Function Calling
- [x] Web Search Tool
- [x] Calculator Tool
- [x] Image Upload & Analysis
- [ ] More Tools (Weather, Translation, etc.)
- [ ] Voice Input/Output
- [ ] RAG (Retrieval Augmented Generation)
- [ ] Multi-Agent Collaboration

## License

MIT License

## Acknowledgments

- UI/UX inspired by [Rakuten AI](https://ai.rakuten.co.jp/chat)
- Built with [Next.js](https://nextjs.org/)
- Powered by [OpenAI](https://openai.com/) and [Google AI](https://ai.google.dev/)

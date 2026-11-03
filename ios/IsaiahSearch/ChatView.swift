import SwiftUI
import SafariServices

struct ChatMessage: Identifiable, Codable {
    var id = UUID()
    let role: String
    let content: String
}

struct ModelChoice: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
}

@MainActor
final class ChatStore: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var draft = ""
    @Published var selectedModel = "isaiahai_7_super"
    @Published var busy = false
    @Published var error: String?
    @Published var apiBase = UserDefaults.standard.string(forKey: "isaiahApiBase") ?? "https://isaiah-ai-acel.netlify.app/api"

    let models = [
        ModelChoice(id: "isaiahai_7_super", title: "IsaiahAI 7.0 SUPER", subtitle: "Inkling · OpenRouter"),
        ModelChoice(id: "breakaway_1_0", title: "Breakaway 1.0", subtitle: "Gemini-powered assistant"),
        ModelChoice(id: "isaiah_codepro", title: "IsaiahAI CodePro", subtitle: "GPT-OSS 120B · high reasoning")
    ]

    func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !busy else { return }
        draft = ""
        messages.append(ChatMessage(role: "user", content: text))
        busy = true
        error = nil
        defer { busy = false }
        guard let url = URL(string: apiBase.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/chat") else {
            error = "The API address is invalid."; return
        }
        let history = messages.dropLast().suffix(20).map { ["role": $0.role, "content": $0.content] }
        let payload: [String: Any] = [
            "model": selectedModel, "message": text, "history": history,
            "searchWebEnabled": true, "showThinking": true
        ]
        do {
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = 65
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                throw NSError(domain: "IsaiahSearch", code: 1, userInfo: [NSLocalizedDescriptionKey: body?["error"] as? String ?? "The AI service returned an error."])
            }
            let result = try JSONDecoder().decode(ChatReply.self, from: data)
            messages.append(ChatMessage(role: "assistant", content: result.content))
        } catch {
            self.error = error.localizedDescription
        }
    }
    func saveAPI() { UserDefaults.standard.set(apiBase, forKey: "isaiahApiBase") }
}

struct ChatReply: Decodable { let content: String }

struct ChatView: View {
    @StateObject private var store = ChatStore()
    @State private var browserURL = URL(string: "https://www.google.com")!
    @State private var showBrowser = false
    @State private var showSettings = false
    @FocusState private var inputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    Image(systemName: "sparkles").font(.title2.bold()).foregroundStyle(.cyan)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("IsaiahSearch").font(.headline)
                        Text("ST.AMOUR ELECTRONICS").font(.system(size: 9, weight: .bold)).tracking(1.5).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button { showBrowser = true } label: { Image(systemName: "globe").font(.title3) }
                    Button { showSettings = true } label: { Image(systemName: "gearshape").font(.title3) }
                }.padding()
                Picker("AI model", selection: $store.selectedModel) {
                    ForEach(store.models) { model in
                        Text(model.title).tag(model.id)
                    }
                }.pickerStyle(.menu).tint(.cyan).padding(.horizontal)
                Divider()
                if store.messages.isEmpty {
                    Spacer()
                    Image(systemName: "sparkles").font(.system(size: 48)).foregroundStyle(.cyan)
                    Text("What can I help you with?").font(.title2.bold()).padding(.top, 12)
                    Text("Ask, research, code, or plan with IsaiahAI.").foregroundStyle(.secondary).font(.subheadline)
                    Spacer()
                } else {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(alignment: .leading, spacing: 14) {
                                ForEach(store.messages) { message in
                                    HStack {
                                        if message.role == "assistant" { bubble(message).frame(maxWidth: .infinity, alignment: .leading) }
                                        else { Spacer(minLength: 35); bubble(message) }
                                    }.id(message.id)
                                }
                                if store.busy { HStack { ProgressView().tint(.cyan); Text("IsaiahAI is thinking…").font(.caption).foregroundStyle(.secondary) }.padding(.horizontal) }
                            }.padding()
                        }.onChange(of: store.messages.count) { _, _ in
                            if let last = store.messages.last { proxy.scrollTo(last.id, anchor: .bottom) }
                        }
                    }
                }
                if let error = store.error {
                    Text(error).font(.caption).foregroundStyle(.red).padding(.horizontal)
                }
                HStack(alignment: .bottom, spacing: 10) {
                    TextField("Message IsaiahSearch…", text: $store.draft, axis: .vertical)
                        .lineLimit(1...5).padding(12).background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 18))
                        .focused($inputFocused)
                    Button {
                        inputFocused = false
                        Task { await store.send() }
                    } label: {
                        Image(systemName: "arrow.up").font(.headline.bold()).foregroundStyle(.black)
                            .frame(width: 44, height: 44).background(LinearGradient(colors: [.cyan, .purple.opacity(0.8)], startPoint: .topLeading, endPoint: .bottomTrailing), in: Circle())
                    }.disabled(store.busy || store.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }.padding().background(.ultraThinMaterial)
            }
            .background(Color(red: 0.025, green: 0.04, blue: 0.075))
            .preferredColorScheme(.dark)
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showBrowser) { SafariSheet(url: browserURL) }
            .sheet(isPresented: $showSettings) {
                NavigationStack {
                    Form {
                        Section("AI service") {
                            TextField("API base URL", text: $store.apiBase).textInputAutocapitalization(.never).autocorrectionDisabled()
                            Text("The app sends chat requests to your existing IsaiahAI backend. Provider keys stay on the server.").font(.caption).foregroundStyle(.secondary)
                        }
                        Section("Models") {
                            ForEach(store.models) { m in
                                VStack(alignment: .leading) { Text(m.title); Text(m.subtitle).font(.caption).foregroundStyle(.secondary) }
                            }
                        }
                    }.navigationTitle("Settings").toolbar { ToolbarItem(placement: .confirmationAction) { Button("Save") { store.saveAPI(); showSettings = false } } }
                }.preferredColorScheme(.dark)
            }
        }
    }

    @ViewBuilder private func bubble(_ message: ChatMessage) -> some View {
        Text(message.content).textSelection(.enabled).padding(14)
            .background(message.role == "user" ? Color.blue.opacity(0.22) : Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 18))
            .frame(maxWidth: 330, alignment: message.role == "user" ? .trailing : .leading)
    }
}

struct SafariSheet: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController { SFSafariViewController(url: url) }
    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}

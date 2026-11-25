import SwiftUI
import SafariServices
import PhotosUI
import UIKit

struct ChatMessage: Identifiable, Codable {
    var id = UUID()
    let role: String
    let content: String
    let images: [Data]?

    init(role: String, content: String, images: [Data] = []) {
        self.role = role
        self.content = content
        self.images = images.isEmpty ? nil : images
    }
}

struct ChatImageAttachment: Identifiable {
    let id = UUID()
    let name: String
    let data: Data
    var dataURI: String { "data:image/jpeg;base64," + data.base64EncodedString() }
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
    @Published var pendingImages: [ChatImageAttachment] = []
    @Published var apiBase = UserDefaults.standard.string(forKey: "isaiahApiBase") ?? "https://codepro-gateway-production.up.railway.app/api"

    let models = [
        ModelChoice(id: "isaiahai_7_super", title: "IsaiahAI 7.0 SUPER", subtitle: "Inkling · OpenRouter"),
        ModelChoice(id: "breakaway_1_0", title: "Breakaway 1.0", subtitle: "Gemini-powered assistant"),
        ModelChoice(id: "isaiah_codepro", title: "IsaiahAI CodePro", subtitle: "GPT-OSS 120B · high reasoning")
    ]

    func addImages(_ items: [PhotosPickerItem]) async {
        let available = max(0, 4 - pendingImages.count)
        for item in items.prefix(available) {
            do {
                guard let raw = try await item.loadTransferable(type: Data.self),
                      let image = UIImage(data: raw) else {
                    throw NSError(domain: "IsaiahSearch", code: 2, userInfo: [NSLocalizedDescriptionKey: "One of the selected photos could not be read."])
                }
                let longestSide = max(image.size.width, image.size.height)
                let scale = min(1, 2048 / max(1, longestSide))
                let targetSize = CGSize(width: max(1, image.size.width * scale), height: max(1, image.size.height * scale))
                let renderer = UIGraphicsImageRenderer(size: targetSize)
                let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: targetSize)) }
                guard let jpeg = resized.jpegData(compressionQuality: 0.84), !jpeg.isEmpty else {
                    throw NSError(domain: "IsaiahSearch", code: 3, userInfo: [NSLocalizedDescriptionKey: "The selected photo could not be compressed."])
                }
                guard jpeg.count <= 4 * 1024 * 1024 else {
                    throw NSError(domain: "IsaiahSearch", code: 4, userInfo: [NSLocalizedDescriptionKey: "A photo is larger than 4 MB after compression. Choose a smaller image."])
                }
                let currentBytes = pendingImages.reduce(0) { $0 + $1.data.count }
                guard currentBytes + jpeg.count <= 8 * 1024 * 1024 else {
                    throw NSError(domain: "IsaiahSearch", code: 5, userInfo: [NSLocalizedDescriptionKey: "The combined image attachments must be 8 MB or smaller."])
                }
                pendingImages.append(ChatImageAttachment(name: "photo-\(pendingImages.count + 1).jpg", data: jpeg))
            } catch {
                self.error = error.localizedDescription
            }
        }
        if items.count > available {
            error = "You can attach up to four images to one message."
        }
    }

    func removeImage(_ id: UUID) {
        pendingImages.removeAll { $0.id == id }
    }

    func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        let images = pendingImages
        let message = text.isEmpty && !images.isEmpty ? "Please inspect the attached image(s) and describe what you can see." : text
        guard (!message.isEmpty || !images.isEmpty), !busy else { return }
        draft = ""
        pendingImages = []
        messages.append(ChatMessage(role: "user", content: message, images: images.map { $0.data }))
        busy = true
        error = nil
        defer { busy = false }
        guard let url = URL(string: apiBase.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/chat") else {
            error = "The API address is invalid."; return
        }

        var remainingImages = max(0, 4 - images.count)
        var remainingImageBytes = max(0, 8 * 1024 * 1024 - images.reduce(0) { $0 + $1.data.count })
        var history: [[String: Any]] = []
        for item in messages.dropLast().suffix(20) {
            var entry: [String: Any] = ["role": item.role, "content": item.content]
            if item.role == "user", let oldImages = item.images, !oldImages.isEmpty, remainingImages > 0 {
                var kept: [Data] = []
                for imageData in oldImages.reversed() {
                    if kept.count >= remainingImages || imageData.count > remainingImageBytes { continue }
                    kept.append(imageData)
                    remainingImageBytes -= imageData.count
                }
                kept.reverse()
                if !kept.isEmpty {
                    entry["images"] = kept.enumerated().map { index, data in
                        ["name": "history-photo-\(index + 1).jpg", "mimeType": "image/jpeg", "data": "data:image/jpeg;base64," + data.base64EncodedString()]
                    }
                    remainingImages -= kept.count
                }
            }
            history.append(entry)
        }
        let imagePayload = images.map { image in
            ["name": image.name, "mimeType": "image/jpeg", "data": image.dataURI] as [String: Any]
        }
        let payload: [String: Any] = [
            "model": selectedModel, "selectedModel": selectedModel, "message": message, "history": history,
            "images": imagePayload, "searchWebEnabled": true, "showThinking": true, "stream": false
        ]
        do {
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = 180
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                throw NSError(domain: "IsaiahSearch", code: httpStatus(response), userInfo: [NSLocalizedDescriptionKey: body?["error"] as? String ?? "The AI service returned an error."])
            }
            let result = try JSONDecoder().decode(ChatReply.self, from: data)
            messages.append(ChatMessage(role: "assistant", content: result.content))
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func httpStatus(_ response: URLResponse) -> Int {
        (response as? HTTPURLResponse)?.statusCode ?? 0
    }

    func saveAPI() { UserDefaults.standard.set(apiBase, forKey: "isaiahApiBase") }
}

struct ChatReply: Decodable { let content: String }

struct ChatView: View {
    @StateObject private var store = ChatStore()
    @State private var browserURL = URL(string: "https://www.google.com")!
    @State private var showBrowser = false
    @State private var showSettings = false
    @State private var photoSelection: [PhotosPickerItem] = []
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
                        }.onChange(of: store.messages.count) { _ in
                            if let last = store.messages.last { proxy.scrollTo(last.id, anchor: .bottom) }
                        }
                    }
                }
                if let error = store.error {
                    Text(error).font(.caption).foregroundStyle(.red).padding(.horizontal)
                }
                if !store.pendingImages.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(store.pendingImages) { attachment in
                                ZStack(alignment: .topTrailing) {
                                    if let image = UIImage(data: attachment.data) {
                                        Image(uiImage: image).resizable().scaledToFill()
                                            .frame(width: 66, height: 66).clipShape(RoundedRectangle(cornerRadius: 12))
                                    }
                                    Button { store.removeImage(attachment.id) } label: {
                                        Image(systemName: "xmark.circle.fill").foregroundStyle(.white, .black.opacity(0.5))
                                    }.padding(3)
                                }
                            }
                        }.padding(.horizontal)
                    }.padding(.bottom, 6)
                }
                HStack(alignment: .bottom, spacing: 10) {
                    PhotosPicker(selection: $photoSelection, maxSelectionCount: 4, matching: .images) {
                        Image(systemName: "photo").font(.title3).foregroundStyle(.cyan)
                            .frame(width: 44, height: 44).background(Color.white.opacity(0.07), in: Circle())
                    }
                    .onChange(of: photoSelection) { selected in
                        guard !selected.isEmpty else { return }
                        Task {
                            await store.addImages(selected)
                            photoSelection = []
                        }
                    }
                    TextField("Message IsaiahSearch…", text: $store.draft, axis: .vertical)
                        .lineLimit(1...5).padding(12).background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 18))
                        .focused($inputFocused)
                    Button {
                        inputFocused = false
                        Task { await store.send() }
                    } label: {
                        Image(systemName: "arrow.up").font(.headline.bold()).foregroundStyle(.black)
                            .frame(width: 44, height: 44).background(LinearGradient(colors: [.cyan, .purple.opacity(0.8)], startPoint: .topLeading, endPoint: .bottomTrailing), in: Circle())
                    }.disabled(store.busy || (store.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && store.pendingImages.isEmpty))
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
        VStack(alignment: .leading, spacing: 8) {
            Text(message.content).textSelection(.enabled)
            if let images = message.images, !images.isEmpty {
                ForEach(images.indices, id: \.self) { index in
                    if let image = UIImage(data: images[index]) {
                        Image(uiImage: image).resizable().scaledToFit()
                            .frame(maxWidth: 250, maxHeight: 220)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
        }
        .padding(14)
        .background(message.role == "user" ? Color.blue.opacity(0.22) : Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 18))
        .frame(maxWidth: 330, alignment: message.role == "user" ? .trailing : .leading)
    }
}

struct SafariSheet: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController { SFSafariViewController(url: url) }
    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}

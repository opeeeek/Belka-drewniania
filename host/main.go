//go:build windows

// BelkaDR – okno programu (Windows, WebView2) dla aplikacji obliczeń belek drewnianych.
// Interfejs i obliczenia: osadzony plik BelkaDR.html (budowany przez tools/build.js).
// Host udostępnia stronie: hostRequest (zapis/odczyt plików z natywnymi oknami dialogowymi),
// hostStore (autozapis w %LOCALAPPDATA%\BelkaDR\autosave.json) i hostTitle (tytuł okna).
package main

import (
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	"github.com/jchv/go-webview2"
)

//go:embed BelkaDR.html
var appHTML string

var (
	user32   = syscall.NewLazyDLL("user32.dll")
	comdlg32 = syscall.NewLazyDLL("comdlg32.dll")
	shell32  = syscall.NewLazyDLL("shell32.dll")

	pMessageBoxW                   = user32.NewProc("MessageBoxW")
	pSetWindowTextW                = user32.NewProc("SetWindowTextW")
	pGetSystemMetrics              = user32.NewProc("GetSystemMetrics")
	pSetProcessDpiAwarenessContext = user32.NewProc("SetProcessDpiAwarenessContext")
	pSetProcessDPIAware            = user32.NewProc("SetProcessDPIAware")
	pGetDpiForSystem               = user32.NewProc("GetDpiForSystem")
	pGetOpenFileNameW              = comdlg32.NewProc("GetOpenFileNameW")
	pGetSaveFileNameW              = comdlg32.NewProc("GetSaveFileNameW")
	pShellExecuteW                 = shell32.NewProc("ShellExecuteW")
)

type openFileName struct {
	lStructSize       uint32
	hwndOwner         uintptr
	hInstance         uintptr
	lpstrFilter       *uint16
	lpstrCustomFilter *uint16
	nMaxCustFilter    uint32
	nFilterIndex      uint32
	lpstrFile         *uint16
	nMaxFile          uint32
	lpstrFileTitle    *uint16
	nMaxFileTitle     uint32
	lpstrInitialDir   *uint16
	lpstrTitle        *uint16
	flags             uint32
	nFileOffset       uint16
	nFileExtension    uint16
	lpstrDefExt       *uint16
	lCustData         uintptr
	lpfnHook          uintptr
	lpTemplateName    *uint16
	pvReserved        uintptr
	dwReserved        uint32
	flagsEx           uint32
}

const (
	ofnOverwritePrompt = 0x00000002
	ofnNoChangeDir     = 0x00000008
	ofnPathMustExist   = 0x00000800
	ofnFileMustExist   = 0x00001000
	ofnExplorer        = 0x00080000
)

type hostReq struct {
	ID      int    `json:"id"`
	Op      string `json:"op"`
	Path    string `json:"path"`
	Name    string `json:"name"`
	Content string `json:"content"`
	B64     bool   `json:"b64"`
	Filter  string `json:"filter"`
}

type hostRes struct {
	OK      bool   `json:"ok"`
	Path    string `json:"path,omitempty"`
	Content string `json:"content,omitempty"`
	Err     string `json:"err,omitempty"`
}

// filtry okien dialogowych: opis|wzorzec|…
var filters = map[string][2]string{
	"project": {"Projekt belki drewnianej (*.belkadr)|*.belkadr|Plik JSON (*.json)|*.json|Wszystkie pliki (*.*)|*.*", "belkadr"},
	"html":    {"Raport HTML (*.html)|*.html;*.htm|Wszystkie pliki (*.*)|*.*", "html"},
	"odt":     {"Dokument OpenDocument (*.odt)|*.odt|Wszystkie pliki (*.*)|*.*", "odt"},
	"dxf":     {"Rysunek DXF (*.dxf)|*.dxf|Wszystkie pliki (*.*)|*.*", "dxf"},
}

func utf16z(s string) *uint16 { p, _ := syscall.UTF16PtrFromString(s); return p }

func filterFor(kind string) (*uint16, *uint16) {
	f, ok := filters[kind]
	if !ok {
		f = filters["project"]
	}
	u := syscall.StringToUTF16(strings.ReplaceAll(f[0], "|", "\x00") + "\x00")
	return &u[0], utf16z(f[1])
}

func messageBox(hwnd uintptr, text, title string, flags uintptr) {
	pMessageBoxW.Call(hwnd, uintptr(unsafe.Pointer(utf16z(text))), uintptr(unsafe.Pointer(utf16z(title))), flags)
}

// okno „Otwórz” / „Zapisz jako” – zwraca ścieżkę albo "" po anulowaniu
func fileDialog(hwnd uintptr, save bool, kind, defName string) string {
	buf := make([]uint16, 4096)
	if defName != "" {
		copy(buf, syscall.StringToUTF16(defName))
	}
	flt, ext := filterFor(kind)
	ofn := openFileName{
		hwndOwner:    hwnd,
		lpstrFilter:  flt,
		nFilterIndex: 1,
		lpstrFile:    &buf[0],
		nMaxFile:     uint32(len(buf)),
		lpstrDefExt:  ext,
		flags:        ofnExplorer | ofnNoChangeDir | ofnPathMustExist,
	}
	ofn.lStructSize = uint32(unsafe.Sizeof(ofn))
	var r uintptr
	if save {
		ofn.flags |= ofnOverwritePrompt
		ofn.lpstrTitle = utf16z("Zapisz")
		r, _, _ = pGetSaveFileNameW.Call(uintptr(unsafe.Pointer(&ofn)))
	} else {
		ofn.flags |= ofnFileMustExist
		ofn.lpstrTitle = utf16z("Otwórz projekt belki")
		r, _, _ = pGetOpenFileNameW.Call(uintptr(unsafe.Pointer(&ofn)))
	}
	if r == 0 {
		return ""
	}
	return syscall.UTF16ToString(buf)
}

func dataDir() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base, _ = os.UserConfigDir()
	}
	d := filepath.Join(base, "BelkaDR")
	_ = os.MkdirAll(d, 0o755)
	return d
}

func writeAtomic(path string, data []byte) error {
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func jsonStr(v interface{}) string { b, _ := json.Marshal(v); return string(b) }

func shellOpen(path string) {
	pShellExecuteW.Call(0, uintptr(unsafe.Pointer(utf16z("open"))), uintptr(unsafe.Pointer(utf16z(path))), 0, 0, 1)
}

func systemDPI() int {
	if pGetDpiForSystem.Find() == nil {
		if d, _, _ := pGetDpiForSystem.Call(); d > 0 {
			return int(d)
		}
	}
	return 96
}

func systemMetric(i uintptr) int { v, _, _ := pGetSystemMetrics.Call(i); return int(v) }

func fileURL(p string) string {
	p = filepath.ToSlash(p)
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	return "file://" + strings.ReplaceAll(p, " ", "%20")
}

// tryb awaryjny – brak WebView2: aplikacja w domyślnej przeglądarce
func fallback(htmlPath string) {
	messageBox(0, "Nie znaleziono składnika Microsoft Edge WebView2 Runtime (standardowo obecny w Windows 10/11).\n\n"+
		"Aplikacja zostanie otwarta w domyślnej przeglądarce – obliczenia działają tak samo, a projekty zapisywane są do folderu Pobrane.\n\n"+
		"Aby korzystać z wersji okienkowej, zainstaluj WebView2 Runtime:\nhttps://developer.microsoft.com/microsoft-edge/webview2/", "BelkaDR", 0x40)
	shellOpen(htmlPath)
}

func main() {
	// ostre skalowanie na ekranach o dużej rozdzielczości
	if pSetProcessDpiAwarenessContext.Find() == nil {
		pSetProcessDpiAwarenessContext.Call(^uintptr(3)) // DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4
	} else if pSetProcessDPIAware.Find() == nil {
		pSetProcessDPIAware.Call()
	}
	dir := dataDir()
	htmlPath := filepath.Join(dir, "BelkaDR.html")
	if err := os.WriteFile(htmlPath, []byte(appHTML), 0o644); err != nil {
		messageBox(0, "Nie można uruchomić aplikacji: "+err.Error(), "BelkaDR", 0x10)
		return
	}
	sw, sh := systemMetric(0), systemMetric(1)
	ww, wh := sw*88/100, sh*86/100
	if minW := 1100 * systemDPI() / 96; ww < minW && sw > minW {
		ww = minW
	}
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  filepath.Join(dir, "WebView2"),
		WindowOptions: webview2.WindowOptions{
			Title:  "BelkaDR – belki drewniane wg PN-EN 1995-1-1",
			Width:  uint(ww),
			Height: uint(wh),
			Center: true,
			IconId: 1, // ikona z zasobów (rsrc_windows_amd64.syso – tools/make_winres.py)
		},
	})
	if w == nil {
		fallback(htmlPath)
		return
	}
	defer w.Destroy()
	hwnd := uintptr(w.Window())

	// autozapis z poprzedniej sesji
	init := "window.__DRHOST=1;"
	if b, err := os.ReadFile(filepath.Join(dir, "autosave.json")); err == nil && json.Valid(b) {
		init += "window.__AUTOSAVE=" + string(b) + ";"
	}
	// plik projektu podany w wierszu poleceń (np. dwuklik na pliku .belkadr)
	if len(os.Args) > 1 {
		p := os.Args[1]
		if b, err := os.ReadFile(p); err == nil {
			init += "window.__OPENFILE=" + jsonStr(map[string]string{"path": p, "content": string(b)}) + ";"
		}
	}
	w.Init(init)

	reply := func(id int, res hostRes) {
		w.Dispatch(func() { w.Eval(fmt.Sprintf("window.__hostReply(%d,%s)", id, jsonStr(res))) })
	}
	_ = w.Bind("hostRequest", func(raw string) {
		var q hostReq
		if err := json.Unmarshal([]byte(raw), &q); err != nil {
			return
		}
		go w.Dispatch(func() {
			switch q.Op {
			case "save":
				path := q.Path
				if path == "" {
					path = fileDialog(hwnd, true, q.Filter, q.Name)
				}
				if path == "" {
					reply(q.ID, hostRes{OK: false})
					return
				}
				data := []byte(q.Content)
				if q.B64 {
					var err error
					if data, err = base64.StdEncoding.DecodeString(q.Content); err != nil {
						reply(q.ID, hostRes{Err: err.Error()})
						return
					}
				}
				if err := writeAtomic(path, data); err != nil {
					reply(q.ID, hostRes{Err: err.Error()})
					return
				}
				reply(q.ID, hostRes{OK: true, Path: path})
			case "open":
				path := fileDialog(hwnd, false, q.Filter, "")
				if path == "" {
					reply(q.ID, hostRes{OK: false})
					return
				}
				b, err := os.ReadFile(path)
				if err != nil {
					reply(q.ID, hostRes{Err: err.Error()})
					return
				}
				reply(q.ID, hostRes{OK: true, Path: path, Content: string(b)})
			case "shell":
				shellOpen(q.Path)
				reply(q.ID, hostRes{OK: true})
			default:
				reply(q.ID, hostRes{Err: "nieznana operacja " + q.Op})
			}
		})
	})
	_ = w.Bind("hostStore", func(data string) {
		if json.Valid([]byte(data)) {
			_ = writeAtomic(filepath.Join(dir, "autosave.json"), []byte(data))
		}
	})
	_ = w.Bind("hostTitle", func(t string) {
		pSetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(utf16z(t))))
	})
	w.Navigate(fileURL(htmlPath))
	w.Run()
}

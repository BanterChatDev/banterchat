package logger

import (
	"fmt"
	"io"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"
)

type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
)

var levelNames = map[Level]string{
	DEBUG: "DBG",
	INFO:  "INF",
	WARN:  "WRN",
	ERROR: "ERR",
}

var levelColors = map[Level]string{
	DEBUG: "\033[36m",
	INFO:  "\033[32m",
	WARN:  "\033[33m",
	ERROR: "\033[31m",
}

const (
	resetColor   = "\033[0m"
	dimColor     = "\033[2m"
	boldColor    = "\033[1m"
	cyanColor    = "\033[36m"
	magentaColor = "\033[35m"
)

type Logger struct {
	mu       sync.Mutex
	out      io.Writer
	minLevel Level
	color    bool
}

var std = &Logger{
	out:      os.Stdout,
	minLevel: DEBUG,
	color:    true,
}

func SetLevel(l Level)  { std.mu.Lock(); std.minLevel = l; std.mu.Unlock() }
func SetColor(on bool)  { std.mu.Lock(); std.color = on; std.mu.Unlock() }

func Debug(msg string, args ...any) { std.log(DEBUG, msg, args...) }
func Info(msg string, args ...any)  { std.log(INFO, msg, args...) }
func Warn(msg string, args ...any)  { std.log(WARN, msg, args...) }
func Error(msg string, args ...any) { std.log(ERROR, msg, args...) }

func (l *Logger) log(level Level, msg string, args ...any) {
	if level < l.minLevel {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	ts := time.Now().Format("15:04:05.000")
	caller := getCaller()
	lvl := levelNames[level]

	if l.color {
		fmt.Fprintf(l.out, "%s%s%s %s%s%s %s[%s]%s %s%s%s",
			dimColor, ts, resetColor,
			levelColors[level], lvl, resetColor,
			dimColor, caller, resetColor,
			boldColor, msg, resetColor)
		for i := 0; i < len(args)-1; i += 2 {
			fmt.Fprintf(l.out, " %s%v%s=%s%v%s", cyanColor, args[i], resetColor, magentaColor, args[i+1], resetColor)
		}
	} else {
		fmt.Fprintf(l.out, "%s %s [%s] %s", ts, lvl, caller, msg)
		for i := 0; i < len(args)-1; i += 2 {
			fmt.Fprintf(l.out, " %v=%v", args[i], args[i+1])
		}
	}
	fmt.Fprintln(l.out)
}

func getCaller() string {
	_, file, line, ok := runtime.Caller(3)
	if !ok {
		return "?"
	}
	parts := strings.Split(file, "/")
	if len(parts) > 2 {
		return fmt.Sprintf("%s/%s:%d", parts[len(parts)-2], parts[len(parts)-1], line)
	}
	return fmt.Sprintf("%s:%d", parts[len(parts)-1], line)
}	
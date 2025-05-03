const { Gio } = imports.gi;

class CommandRunner {
    static runCommand(argv) {
        return new Promise((resolve, reject) => {
            try {
                const proc = new Gio.Subprocess({
                    argv,
                    flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
                });

                proc.init(null);

                proc.communicate_utf8_async(null, null, (proc, res) => {
                    try {
                        const [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        const success = proc.get_successful();
                        if (!success) {
                            console.error(`[binu] Command failed: ${argv.join(' ')}\n${stderr}`);
                        }
                        resolve([success, stdout]);
                    } catch (e) {
                        reject(e);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}

export default CommandRunner;

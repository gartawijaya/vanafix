const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class Vana {
    headers(initData) {
        return {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            "X-Telegram-Web-App-Init-Data": initData
        };
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[*] Need to wait ${i} seconds to continue...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async getPlayerData(initData) {
        const url = 'https://www.vanadatahero.com/api/player';
        const headers = this.headers(initData);
        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (error) {
            this.log(`${'Error while calling API'.red}`);
            console.error(error);
        }
    }

    async postTaskCompletion(initData, taskId, points) {
        const url = `https://www.vanadatahero.com/api/tasks/${taskId}`;
        const headers = this.headers(initData);
        const payload = {
            status: "completed",
            points: parseFloat(points)
        };

        try {
            const response = await axios.post(url, payload, { headers });
            if (response.data && response.data.message === 'Points limit exceeded') {
                this.log(`${'You have exceeded the points limit for today!'.red}`);
                return false; 
            }
            return true;
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message === 'Points limit exceeded') {
                this.log(`${'You have exceeded the points limit for today!'.red}`);
                return false; 
            }
            this.log(`${'Error while completing task'.red}`);
            console.error(error);
            return false;
        }
    }

    async getTasks(initData) {
        const url = 'https://www.vanadatahero.com/api/tasks';
        const headers = this.headers(initData);
        try {
            const response = await axios.get(url, { headers });
            return response.data.tasks;
        } catch (error) {
            this.log(`${'Error while fetching tasks list'.red}`);
            console.error(error);
        }
    }

    async completePendingTasks(initData) {
        const tasks = await this.getTasks(initData);
        const excludeIds = [2, 17, 5, 9];  // IDs of tasks to exclude
    
        for (const task of tasks) {
            if (task.completed.length === 0 && !excludeIds.includes(task.id)) { 
                const success = await this.postTaskCompletion(initData, task.id, task.points);
                if (success) {
                    this.log(`${`Successfully completed task`.green} ${task.name.yellow} ${`| reward: `.green} ${task.points}`);
                } else {
                    continue;
                }
            }
        }
    }

    async processAccount(initData, hoinhiemvu, accountIndex) {
        try {
            const playerData = await this.getPlayerData(initData);

            if (playerData) {
                console.log(`========== Account ${accountIndex} | ${playerData.tgFirstName.green} ==========`);
                this.log(`${'Points:'.green} ${playerData.points.toString().white}`);
                this.log(`${'Multiplier:'.green} ${playerData.multiplier.toString().white}`);
            } else {
                this.log(`${'Error: User data not found'.red}`);
            }

            while (true) {
                const taskCompleted = await this.postTaskCompletion(initData, 1, (Math.random() * (50000.0 - 40000.0) + 40000.0).toFixed(1));

                if (!taskCompleted) {
                    break;
                }

                const updatedPlayerData = await this.getPlayerData(initData);

                if (updatedPlayerData) {
                    this.log(`${'Tap successful. Current balance:'.green} ${updatedPlayerData.points.toString().white}`);
                } else {
                    this.log(`${'Error: User data not found after tapping'.red}`);
                }

                await new Promise(resolve => setTimeout(resolve, 1000)); 
            }

            if (hoinhiemvu) {
                await this.completePendingTasks(initData);
            }

        } catch (error) {
            this.log(`${'Error while processing account'.red}`);
        }
    }

    async askQuestion(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => rl.question(question, answer => {
            rl.close();
            resolve(answer);
        }));
    }

    async main() {
        const nhiemvu = await this.askQuestion('Do you want to complete tasks? (y/n): ');
        const hoinhiemvu = nhiemvu.toLowerCase() === 'y';
        const dataFile = path.join(__dirname, 'data.txt');
        const initDataList = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        for (let i = 0; i < initDataList.length; i++) {
            const initData = initDataList[i];
            await this.processAccount(initData, hoinhiemvu, i + 1);
            await this.waitWithCountdown(3);
        }
        await this.waitWithCountdown(86400);
    }
}

if (require.main === module) {
    const vana = new Vana();
    vana.main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
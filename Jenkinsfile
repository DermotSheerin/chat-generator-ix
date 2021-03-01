pipeline {
    agent { dockerfile true }
    stages {
        stage('Test') {
            steps {
				sh 'docker ps -a'
				sh 'chmode 777 deploy.sh'
				sh './deploy.sh'
            }
        }
    }
}
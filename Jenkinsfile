pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
				sh 'pwd'
				sh 'ls -ltr'
				sh './runDocker.sh'
            }
        }
    }
}